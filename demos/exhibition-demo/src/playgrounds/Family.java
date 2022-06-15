package playgrounds;

import various.Gender;
import various.Person;

public class Family implements Playground {
    private Person mother;

    private Person father;

    private Person son;

    private Person daughter;

    @Override
    public void playground() {
        mother = new Person("Moira", Gender.FEMALE);
        father = new Person("Robert", Gender.MALE);
        son = new Person("Oliver", Gender.MALE);
        daughter = new Person("Thea", Gender.FEMALE);

        mother.setChildren(new Person[]{son, daughter});
        father.setChildren(new Person[]{son, daughter});

        son.setSiblings(new Person[]{daughter});
        daughter.setSiblings(new Person[]{son});

        son.setMother(mother);
        daughter.setMother(mother);

        son.setFather(father);
        daughter.setFather(father);

        String toString = toString();

        System.out.println(toString);
    }

    @Override
    public String toString() {
        var text = new StringBuilder("");

        text.append("Mother: ").append(mother.getName()).append("\n");
        text.append("Father: ").append(father.getName()).append("\n");
        text.append("Son: ").append(son.getName()).append("\n");
        text.append("Daughter: ").append(daughter.getName());

        return text.toString();
    }
}
