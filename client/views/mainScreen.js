Template.mainScreen.onRendered(function () {
	// HTTP.call( 'GET', 'https://praiaget.herokuapp.com/rest/praiasget', function( error, response ) {
 //  		if (error) {
 //  			console.log("ERror:", error);
 //  		}
 //  		else{ 
 //  			console.log("Result:", JSON.parse(response.content));
 //  		}
	// });
});
Template.mainScreen.helpers({
	getEmitido:function(){
		let data = Emitido.findOne();
		return data.emitido;
	},
	totalPraias:function() {
		let praias = Praias.find().fetch();
		console.log("Result", praias.length)
		return praias.length;
	},
	totalPraiasLimpas:function() {
		let count = 0,
			count2 = 0,
			praias = Praias.find().fetch();

			praias.forEach(function(item, index){
				if (item.qualidade === "Própria") {
					count++;
				}
				else{
					count2++;
				}
			});
			Session.set("praiasSujas", count2);
			return count;
	},
	totalPraiasSujas:function() {
		return Session.get("praiasSujas");
	},
});