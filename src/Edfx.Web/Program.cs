using Edfx.ApiClient;
using Edfx.Storage;
using Edfx.Web.Components;
using Edfx.Web.Services;
using Polly;

// Load .env (if present) into environment variables before configuration is read.
// Walks up from the working directory, so a .env at the repo root or project dir works.
// No-op when the file is absent (e.g. Docker/Render, which inject real env vars).
DotNetEnv.Env.TraversePath().Load();

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddRazorComponents()
    .AddInteractiveServerComponents();

// EDFX API client + storage + extraction services
var edfx = new EdfxOptions
{
    Username = builder.Configuration["EDFX_USERNAME"] ?? "",
    Password = builder.Configuration["EDFX_PASSWORD"] ?? "",
    BaseUrl  = builder.Configuration["EDFX_BASE_URL"]  ?? "https://api.edfx.moodysanalytics.com/edfx/v1/",
    TokenUrl = builder.Configuration["EDFX_TOKEN_URL"] ?? "https://sso.moodysanalytics.com/sso-api/v1/token",
    UseMock  = bool.TryParse(builder.Configuration["EDFX_USE_MOCK"], out var m) && m
};
builder.Services.AddSingleton(edfx);
builder.Services.AddHttpClient<TokenProvider>();
builder.Services.AddHttpClient<EdfxClient>()
    .AddTransientHttpErrorPolicy(p => p.WaitAndRetryAsync(3,
        n => TimeSpan.FromMilliseconds(300 * Math.Pow(2, n))));
builder.Services.AddSingleton<IEdfxClient>(sp => edfx.UseMock
    ? new MockEdfxClient()
    : sp.GetRequiredService<EdfxClient>());
builder.Services.AddSingleton(new Db(builder.Configuration["SUPABASE_DB_CONNECTION"] ?? ""));
builder.Services.AddScoped<ExtractionRepository>();
builder.Services.AddScoped<PortfolioRepository>();
builder.Services.AddScoped<IExtractionSaver, SaverAdapter>();
builder.Services.AddScoped<ExtractionService>();
builder.Services.AddHttpClient<WhatIfService>();
builder.Services.AddHttpClient<UploadScoreService>();
builder.Services.AddControllers();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Error", createScopeForErrors: true);
}
app.UseStatusCodePagesWithReExecute("/not-found", createScopeForStatusCodePages: true);
app.UseAntiforgery();

app.MapStaticAssets();
app.MapRazorComponents<App>()
    .AddInteractiveServerRenderMode();
app.MapControllers();

app.Run();
