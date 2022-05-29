namespace ExampleCsharpProject
{
    class Point
    {
        public int x;
        public int y;

        public Point(int _x, int _y) => (x, y) = (_x, _y);

        public override string ToString() => $"x: {x} y: {y}";
    }
}