namespace Edfx.Domain;

public record EntitySearchResponse
{
    public List<EntitySummary> Entities { get; init; } = new();
    public int Total { get; init; }
}

public record EntitySummary
{
    public string EntityId { get; init; } = "";
    public string? Pid { get; init; }
    public string? IdentifierBvd { get; init; }
    public string? IdentifierOrbis { get; init; }
    public string? InternationalName { get; init; }
    public string? CountryName { get; init; }
    public string? ContactCity { get; init; }
    public string? PrimaryIndustryNDYDescription { get; init; }
    public string? Ticker { get; init; }
    public string? HasFinancials { get; init; }
    public string? PeerGroupId1 { get; init; }
    public string? PeerGroupId2 { get; init; }
}
