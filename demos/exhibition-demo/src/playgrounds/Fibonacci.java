package playgrounds;

import java.math.BigInteger;

public class Fibonacci implements Playground {
    @Override
    public void playground() {
        final int fibLevel = 20;
        var startRec = System.currentTimeMillis();
        var fibRec = fibonacciRecursion(fibLevel);
        var endRecStartLoop = System.currentTimeMillis();
        var fibLoop = fibonacciLoop(fibLevel);
        var endLoop = System.currentTimeMillis();

        System.out.printf("Recursion: %d milliseconds => %d%n", endRecStartLoop - startRec, fibRec);
        System.out.printf("Loop: %d milliseconds => %d", endLoop - endRecStartLoop, fibLoop);
    }

    private BigInteger fibonacciRecursion(int n) {
        if (n == 1) {
            return BigInteger.ONE;
        }
        if (n <= 0) {
            return BigInteger.ZERO;
        }
        return fibonacciRecursion(n - 1).add(fibonacciRecursion(n - 2));
    }

    private BigInteger fibonacciLoop(int n) {
        var first = BigInteger.ZERO;
        var second = BigInteger.ONE;
        for (int i = 0; i < n; i++) {
            var temp = second;
            second = first.add(second);
            first = temp;
        }
        return first;
    }
}
