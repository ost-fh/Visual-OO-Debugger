public class DoublyLinkedListDemo {

    public static void main(String[] args) {
        final var list = new LinkedList<String>();
        list.prepend("2");
        list.append("3");
        list.prepend("1");
        list.append("4");
    }

    private static class LinkedList<Value> {

        private final Node<Value> headSentinel;

        private final Node<Value> tailSentinel;

        public LinkedList() {
            headSentinel = new Node<>();
            tailSentinel = new Node<>();
            headSentinel.next = tailSentinel;
            tailSentinel.previous = headSentinel;
        }

        public void prepend(Value value) {
            insertNode(headSentinel, headSentinel.next, value);
        }

        public void append(Value value) {
            insertNode(tailSentinel.previous, tailSentinel, value);
        }

        private void insertNode(Node<Value> previous, Node<Value> next, Value value) {
            final var node = new Node<Value>();
            node.value = value;
            node.previous = previous;
            previous.next = node;
            node.next = next;
            next.previous = node;
        }

        private static class Node<Value> {
            public Node<Value> previous;
            public Node<Value> next;
            public Value value;
        }
    }
}
