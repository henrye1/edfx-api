namespace Edfx.Domain;

public record PeerMetricsResponse { public List<PeerMetric> Metrics { get; init; } = new(); }

public record PeerMetric
{
    public string? Metric { get; init; }
    public double? EntityValue { get; init; }
    public double? Percentile { get; init; }
    public double? Median { get; init; }
}

public record PeerMetadataResponse
{
    public string? PeerGroupId { get; init; }
    public string? Name { get; init; }
    public int? Size { get; init; }
}
