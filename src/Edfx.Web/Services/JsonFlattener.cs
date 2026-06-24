using System.Text.Json;

namespace Edfx.Web.Services;

/// <summary>Flattens an EDF-X JSON response into scalar rows for CSV/Excel/PDF export.</summary>
public static class JsonFlattener
{
    public static List<Dictionary<string, object?>> Flatten(string raw)
    {
        using var doc = JsonDocument.Parse(raw);
        var rows = new List<Dictionary<string, object?>>();
        void AddObj(JsonElement o)
        {
            var d = new Dictionary<string, object?>();
            foreach (var p in o.EnumerateObject())
                if (p.Value.ValueKind is not (JsonValueKind.Object or JsonValueKind.Array))
                    d[p.Name] = p.Value.ToString();
            if (d.Count > 0) rows.Add(d);
        }
        var root = doc.RootElement;
        if (root.ValueKind == JsonValueKind.Object && root.TryGetProperty("entities", out var ents) && ents.ValueKind == JsonValueKind.Array)
            foreach (var e in ents.EnumerateArray()) AddObj(e);
        else if (root.ValueKind == JsonValueKind.Array)
            foreach (var e in root.EnumerateArray()) AddObj(e);
        else AddObj(root);
        return rows;
    }
}
