public class PrimitiveTypesDemo {

    public static void main(String[] args) {
        boolean _boolean = false;
        byte _byte = 0;
        char _char = 0;
        short _short = 0;
        int _int = 0;
        long _long = 0;
        float _float = 0;
        double _double = 0;
        //  Break point #1: Stack frame fields
        final var fieldContainer = new FieldContainer(
                _boolean,
                _byte,
                _char,
                _short,
                _int,
                _long,
                _float,
                _double
        );
        objectFields(fieldContainer);
    }

    private static void objectFields(FieldContainer fieldContainer) {
        //  Break point #2: Object fields
        System.out.println(fieldContainer);
    }

    private record FieldContainer(
            boolean _boolean,
            byte _byte,
            char _char,
            short _short,
            int _int,
            long _long,
            float _float,
            double _double
    ) {
    }
}
