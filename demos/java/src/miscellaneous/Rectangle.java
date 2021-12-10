package miscellaneous;

public class Rectangle {
    private int borderWidth;
    private Point topLeft;
    private Point bottomRight;
    private Color backgroundColor;
    private Color borderColor;
    private String text;

    public Rectangle(int borderWidth, Point topLeft, Point bottomRight, Color backgroundColor, Color borderColor,
            String text) {
        this.borderWidth = borderWidth;
        this.topLeft = topLeft;
        this.bottomRight = bottomRight;
        this.backgroundColor = backgroundColor;
        this.borderColor = borderColor;
        this.text = text;
    }

    public String getText() {
        return text;
    }

    public void setText(String text) {
        this.text = text;
    }

    public Color getBorderColor() {
        return borderColor;
    }

    public void setBorderColor(Color borderColor) {
        this.borderColor = borderColor;
    }

    public Color getBackgroundColor() {
        return backgroundColor;
    }

    public void setBackgroundColor(Color backgroundColor) {
        this.backgroundColor = backgroundColor;
    }

    public int getBorderWidth() {
        return borderWidth;
    }

    public Point getBottomRight() {
        return bottomRight;
    }

    public void setBottomRight(Point bottomRight) {
        this.bottomRight = bottomRight;
    }

    public Point getTopLeft() {
        return topLeft;
    }

    public void setTopLeft(Point topLeft) {
        this.topLeft = topLeft;
    }

    public void setBorderWidth(int borderWidth) {
        this.borderWidth = borderWidth;
    }

    @Override
    public String toString() {
        return text;
    }
}
