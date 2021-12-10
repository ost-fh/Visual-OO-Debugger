/**
 *  This is basically the TypeScript equivalent of a phantom type that deals
 *  with TypeScript duck typing. Instead of introducing a generic parameter,
 *  we use a virtual property with an unusual name (`_ ') and a unique value
 *  type (` unique symbol').
 *
 *  Example:
 *
 *    type PhantomType = Phantom<OriginalType, {
 *      readonly _: unique symbol; // Don't forget the `unique' keyword!
 *    }>;
 *
 *    const o1: OriginalType = [...];
 *    const p1: PhantomType = [...];
 *    const o2: OriginalType = p1; // OK
 *    const p2: PhantomType = o1; // NOK
 */
export type Phantom<Type, UniqueSymbolRecord extends Readonly<Record<'_', symbol>>> =
  //  `unique' keyword forgotten?
  { readonly _: unique symbol } extends UniqueSymbolRecord
    ? //  Conflicts between symbol types cannot be avoided.
      never
    : //  OK
      Type & UniqueSymbolRecord;
