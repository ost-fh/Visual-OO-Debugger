namespace ExampleCsharpProject
{
    class Program
    {
        static void Main(string[] args)
        {
            Point? pNull = null;
            int borderWidth = 5;
            Point? topLeft = new Point(1, 1);
            Point topLeftCopy = topLeft;
            Point bottomRight = new Point(5, 7);
            Color background = Color.BLUE;
            Color border = Color.GREEN;
            string text = "null";
            borderWidth = 3;

            topLeft.ToString();

            Rectangle rect = new Rectangle(borderWidth, topLeft, bottomRight, background, border, text);

            Console.WriteLine(rect);

            topLeft.x = 42;

            Dictionary<String, Point?> dict = new Dictionary<String, Point?>();
            dict.Add("top left", topLeft);
            dict.Add("bottom right", bottomRight);
            dict.Add("middle", pNull);

            topLeft = pNull;
            rect.topLeft = topLeft;
            dict["top left"] = topLeft;

            int[] intArray = { 2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89,
                97, 101, 103, 107, 109, 113, 127, 131, 137, 139, 149, 151, 157, 163, 167, 173, 179, 181, 191, 193, 197,
                199, 211, 223, 227, 229, 233, 239, 241, 251, 257, 263, 269, 271 };
            string[] stringArray = { "one", "two" };
            Point?[] points = { new Point(1337, 7331), bottomRight, pNull };

            Console.WriteLine(rect.ToString());
        }
    }
}
