// 
// THIS FILE HAS BEEN GENERATED AUTOMATICALLY
// DO NOT CHANGE IT MANUALLY UNLESS YOU KNOW WHAT YOU'RE DOING
// 
// GENERATED USING @colyseus/schema 0.5.39
// 

using Colyseus.Schema;

public class BodyState : Schema {
	[Type(0, "ref", typeof(V3))]
	public V3 position = new V3();

	[Type(1, "ref", typeof(BoxShape))]
	public BoxShape shape = new BoxShape();
}

