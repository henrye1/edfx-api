namespace Edfx.Domain;

public record PdResponse { public List<PdEntity> Entities { get; init; } = new(); }

public record PdEntity
{
    public string EntityId { get; init; } = "";
    public string? AsOfDate { get; init; }
    public double? Pd { get; init; }
    public string? ImpliedRating { get; init; }
    public string? Confidence { get; init; }
    public List<PdHistoryPoint>? History { get; init; }
}

public record PdHistoryPoint
{
    public string? Date { get; init; }
    public double? Pd { get; init; }
    public string? ImpliedRating { get; init; }
}
