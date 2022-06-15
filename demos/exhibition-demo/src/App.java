import playgrounds.*;

public class App {

    private Playground playground = new Custom();

    public static void main(String[] args) {
        App app = new App();
        app.playground();
    }

    private App(){
        // playground = new Fibonacci();
        // playground = new Rectangle();
        // playground = new CollectionsExample();
        // playground = new Family();
        // playground = new MapsExample();
    }

    private void playground() {
        playground.playground();
    }
}
