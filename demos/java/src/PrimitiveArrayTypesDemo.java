public class PrimitiveArrayTypesDemo {

    public static void main(String[] args) {
        boolean[] booleans = {false};
        byte[] bytes = {0};
        char[] chars = {0};
        short[] shorts = {0};
        int[] ints = {0};
        long[] longs = {0};
        float[] floats = {0};
        double[] doubles = {0};
        //  Break point #1: Stack frame fields
        final var fieldContainer = new FieldContainer(
                booleans,
                bytes,
                chars,
                shorts,
                ints,
                longs,
                floats,
                doubles
        );
        objectFields(fieldContainer);
    }

    private static void objectFields(FieldContainer fieldContainer) {
        //  Break point #2: Object fields
        System.out.println(fieldContainer);
    }

    private record FieldContainer(
            boolean[] booleans,
            byte[] bytes,
            char[] chars,
            short[] shorts,
            int[] ints,
            long[] longs,
            float[] floats,
            double[] doubles
    ) {
    }
}
