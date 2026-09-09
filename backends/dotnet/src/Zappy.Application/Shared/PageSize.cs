namespace Zappy.Application;

public static class PageSize
{
    public const int Maximum = 100;

    public static int Clamp(int? asked, int fallback) => Math.Clamp(asked ?? fallback, 1, Maximum);
}
