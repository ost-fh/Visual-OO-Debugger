package miscellaneous;

import java.util.HashMap;
import java.util.Map;

public class App {

    public static void main(String[] args) throws Exception {
        /*
        int borderWidth = 5;
        Point topLeft = new Point(1, 1);
        Point topLeftCopy = topLeft;
        Point bottomRight = new Point(5, 7);
        Color color = Color.BLUE;
        String text = "topLeft";
        borderWidth = 3;

        Rectangle rect = new Rectangle(
                borderWidth,
                topLeft,
                bottomRight,
                color,
                color,
                text);

        System.out.println(rect);
        */
        int borderWidth = 5;
        Point topLeft = new Point(1, 1);
        Point topLeftCopy = topLeft;
        Point bottomRight = new Point(5, 7);
        Color background = Color.BLUE;
        //  Break point #1: First enum
        Color border = Color.GREEN;
        String text = "topLeft";
        borderWidth = 3;

        Rectangle rect = new Rectangle(borderWidth, topLeft, bottomRight, background, border, text);

        System.out.println(rect);

        topLeft.setX(42);

        Point pNull = null;
        Map<String, Point> map = new HashMap<>();
        map.put("top left", topLeft);
        map.put("bottom right", bottomRight);
        map.put("middle", pNull);

        topLeft = null;
        rect.setTopLeft(topLeft);
        map.put("top left", topLeft);

        int[] intArray = { 2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89,
                97, 101, 103, 107, 109, 113, 127, 131, 137, 139, 149, 151, 157, 163, 167, 173, 179, 181, 191, 193, 197,
                199, 211, 223, 227, 229, 233, 239, 241, 251, 257, 263, 269, 271 };
        String[] stringArray = { "one", "two" };
        Point[] points = { new Point(1337, 7331), bottomRight, pNull };

        //  Break point #2: Full example
        System.out.println(rect);
    }
}
