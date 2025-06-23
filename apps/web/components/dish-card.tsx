import { Star } from "lucide-react";
import Image from "next/image";

interface Dish {
	id: string;
	dishName: string;
	restaurantName: string;
	description: string;
	imageUrl: string;
	rating: number;
	address: string;
	restaurant?: {
		name: string;
		address: string;
		website: string;
	};
}

interface DishCardProps {
	dish: Dish;
}

export default function DishCard({ dish }: DishCardProps) {
	// Support both flat and nested restaurant info
	const restaurant = dish.restaurant || {
		name: dish.restaurantName,
		address: dish.address,
		website: undefined,
	};

	return (
		<div className="bg-white border border-brand-border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200 ease-in-out flex flex-col sm:flex-row">
			<div className="sm:w-1/3 h-48 sm:h-auto relative">
				<Image
					src={dish.imageUrl || "/img/placeholder.svg"}
					alt={`Image of ${dish.dishName}`}
					layout="fill"
					objectFit="cover"
					className="bg-gray-100"
				/>
			</div>
			<div className="p-4 sm:p-6 flex-1">
				<h3 className="text-xl font-semibold text-brand-primary mb-1">
					{dish.dishName}
				</h3>
				{restaurant.website ? (
					<a
						href={restaurant.website}
						target="_blank"
						rel="noopener noreferrer"
						className="block mb-2 group"
						style={{ textDecoration: "none" }}
					>
						<div className="text-sm text-brand-text-muted group-hover:underline font-medium">
							{restaurant.name}
						</div>
						<div className="text-xs text-brand-text-muted group-hover:underline">
							{restaurant.address}
						</div>
						<div className="text-xs text-blue-600 truncate group-hover:underline">
							{restaurant.website
								.replace(/^https?:\/\//, "")
								.replace(/\/$/, "")}
						</div>
					</a>
				) : (
					<div className="mb-2">
						<div className="text-sm text-brand-text-muted font-medium">
							{restaurant.name}
						</div>
						<div className="text-xs text-brand-text-muted">
							{restaurant.address}
						</div>
					</div>
				)}
				{dish.rating && (
					<div className="flex items-center mb-3">
						{[...Array(Math.floor(dish.rating))].map((_, i) => (
							<Star
								key={`full-${
									// biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
									i
								}`}
								className="h-5 w-5 text-yellow-400 fill-yellow-400"
							/>
						))}
						{dish.rating % 1 !== 0 && (
							<Star
								key="half"
								className="h-5 w-5 text-yellow-400"
								style={{ clipPath: "inset(0 50% 0 0)" }}
							/>
						)}
						{[...Array(5 - Math.ceil(dish.rating))].map((_, i) => (
							<Star
								key={`empty-${
									// biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
									i
								}`}
								className="h-5 w-5 text-gray-300"
							/>
						))}
						<span className="ml-2 text-sm text-brand-text-muted">
							{dish.rating.toFixed(1)}
						</span>
					</div>
				)}
				<p className="text-brand-text text-sm leading-relaxed">
					{dish.description}
				</p>
			</div>
		</div>
	);
}
