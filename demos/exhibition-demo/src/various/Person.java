package various;

public class Person {
    private Person father;

    private Person mother;

    private Person[] children;

    private Person[] siblings;

    private Gender gender;

    private String name;

    public Person(String name, Gender gender) {
        this.name = name;
        this.gender = gender;
    }

    public Person getFather() {
        return father;
    }

    public void setFather(Person father) {
        this.father = father;
    }

    public Person getMother() {
        return mother;
    }

    public void setMother(Person mother) {
        this.mother = mother;
    }

    public Person[] getChildren() {
        return children;
    }

    public void setChildren(Person[] children) {
        this.children = children;
    }

    public Person[] getSiblings() {
        return siblings;
    }

    public void setSiblings(Person[] siblings) {
        this.siblings = siblings;
    }

    public Gender getGender() {
        return gender;
    }

    public void setGender(Gender gender) {
        this.gender = gender;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }
}
