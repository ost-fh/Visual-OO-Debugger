package playgrounds;

import various.Color;
import various.Point;

public class Rectangle implements Playground {
    private int borderWidth;
    private Point topLeft;
    private Point bottomRight;
    private Color backgroundColor;
    private Color borderColor;
    private String text;

    @Override
    public void playground() {
        int borderWidth = 5;
        Point topLeft = new Point(1, 1);
        Point topLeftCopy = topLeft;
        Point bottomRight = new Point(5, 7);
        Color color = Color.BLUE;
        String text = "name of rectangle";
        borderWidth = 3;

        this.borderWidth = borderWidth;
        this.topLeft = topLeft;
        this.bottomRight = bottomRight;
        this.borderColor = color;
        this.backgroundColor = color;
        this.text = text;

        Rectangle rect = this;

        topLeft.setX(42);

        topLeftCopy = null;

        System.out.println(rect);
    }

    @Override
    public String toString() {
        return text;
    }
}
