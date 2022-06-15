package playgrounds;

import various.Point;

import java.util.ArrayList;
import java.util.LinkedList;

public class CollectionsExample implements Playground {
    @Override
    public void playground() {
        int[] intArray = {2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89};
        String[] stringArray = {"one", "two"};
        Point[] points = {new Point(1337, 7331), null};

        var list = new ArrayList<int[]>();
        list.add(intArray);

        var linkedList = new LinkedList<String[]>();
        linkedList.add(stringArray);
        linkedList.add(stringArray);

        System.out.println(list);
    }
}
