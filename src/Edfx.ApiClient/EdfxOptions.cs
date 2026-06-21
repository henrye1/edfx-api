namespace Edfx.ApiClient;
public class EdfxOptions
{
    public string Username { get; set; } = "";
    public string Password { get; set; } = "";
    public string BaseUrl { get; set; } = "https://api.edfx.moodysanalytics.com/edfx/v1/";
    public string TokenUrl { get; set; } = "https://sso.moodysanalytics.com/sso-api/v1/token";
    public bool UseMock { get; set; }
}
