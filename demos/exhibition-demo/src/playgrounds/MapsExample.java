package playgrounds;

import various.Point;

import java.util.HashMap;

public class MapsExample implements Playground {
    @Override
    public void playground() {
        var map = new HashMap<String, Point>();
        var point = new Point(1, 2);
        map.put("from variable", point);
        map.put("inline", new Point(3, 4));

        System.out.println(map);
    }
}
