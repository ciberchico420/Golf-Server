// 
// THIS FILE HAS BEEN GENERATED AUTOMATICALLY
// DO NOT CHANGE IT MANUALLY UNLESS YOU KNOW WHAT YOU'RE DOING
// 
// GENERATED USING @colyseus/schema 0.5.39
// 

using Colyseus.Schema;

public class WorldState : Schema {
	[Type(0, "array", typeof(ArraySchema<BodyState>))]
	public ArraySchema<BodyState> bodies = new ArraySchema<BodyState>();
}

