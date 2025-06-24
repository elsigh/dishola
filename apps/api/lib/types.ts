export interface ParsedQuery {
	dishName: string;
	cuisine: string;
}

export interface DishRecommendation {
	id?: string;
	dish: {
		name: string;
		description: string;
		rating: string;
	};
	restaurant: {
		name: string;
		address: string;
		lat: string;
		lng: string;
		website: string;
	};
}
