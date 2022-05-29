namespace ExampleCsharpProject
{
    class Rectangle
    {
        public int? borderWidth;
        public Point? topLeft;
        public Point? bottomRight;
        public Color? backgroundColor;
        public Color? borderColor;
        public string text;

        public Rectangle(int _borderWidth, Point _topLeft, Point _bottomRight, Color _backgroundColor, Color _borderColor, string _text)
         => (borderWidth, topLeft, bottomRight, backgroundColor, borderColor, text) = (_borderWidth, _topLeft, _bottomRight, _backgroundColor, _borderColor, _text);

        public override string ToString() => text;
    }
}