package miscellaneous;

public enum Color {
    RED("red", "#FF0000"), GREEN("green", "#00FF00"), BLUE("blue", "#0000FF");

    private String textValue;
    private String hexValue;

    private Color(String textValue, String hexValue) {
        this.textValue = textValue;
        this.hexValue = hexValue;
    }

    public String getTextValue() {
        return textValue;
    }

    public String getHexValue() {
        return hexValue;
    }

    public void setHexValue(String hexValue) {
        this.hexValue = hexValue;
    }

    public void setTextValue(String textValue) {
        this.textValue = textValue;
    }
}
