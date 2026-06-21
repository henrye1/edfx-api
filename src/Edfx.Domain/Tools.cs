namespace Edfx.Domain;

public record RiskCategoryResponse { public List<RiskCategoryEntity> Entities { get; init; } = new(); }

public record RiskCategoryEntity
{
    public string EntityId { get; init; } = "";
    public string? RiskCategory { get; init; }
    public string? AsOfDate { get; init; }
}

public record TriggersResponse { public List<TriggerEntity> Entities { get; init; } = new(); }

public record TriggerEntity
{
    public string EntityId { get; init; } = "";
    public List<TriggerLine> Triggers { get; init; } = new();
}

public record TriggerLine
{
    public string? Name { get; init; }
    public string? Severity { get; init; }
    public bool? Triggered { get; init; }
}

public record CreditLimitResponse { public List<CreditLimitEntity> Entities { get; init; } = new(); }

public record CreditLimitEntity
{
    public string EntityId { get; init; } = "";
    public double? LimitAmount { get; init; }
    public string? Currency { get; init; }
    public string? Horizon { get; init; }
}
