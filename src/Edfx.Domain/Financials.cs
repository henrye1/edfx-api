namespace Edfx.Domain;

public record StatementsResponse { public List<StatementEntity> Entities { get; init; } = new(); }

public record StatementEntity
{
    public string EntityId { get; init; } = "";
    public List<StatementLine> Statements { get; init; } = new();
}

public record StatementLine
{
    public string? Item { get; init; }
    public string? Period { get; init; }
    public double? Value { get; init; }
    public string? Currency { get; init; }
}

public record RatiosResponse { public List<RatioEntity> Entities { get; init; } = new(); }

public record RatioEntity
{
    public string EntityId { get; init; } = "";
    public List<RatioLine> Ratios { get; init; } = new();
}

public record RatioLine
{
    public string? Name { get; init; }
    public string? Period { get; init; }
    public double? Value { get; init; }
}
