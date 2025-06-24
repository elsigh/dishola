import { Star } from "lucide-react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";

function GoogleMapsIcon() {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 24 24"
			fill="currentColor"
			className="inline-block w-4 h-4 text-blue-600 ml-1 align-text-bottom"
			aria-label="Google Maps"
			role="img"
		>
			<title>Google Maps Icon</title>
			<path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z" />
		</svg>
	);
}

function haversineDistance(
	lat1: number,
	lon1: number,
	lat2: number,
	lon2: number,
) {
	const toRad = (x: number) => (x * Math.PI) / 180;
	const R = 6371e3; // meters
	const φ1 = toRad(lat1);
	const φ2 = toRad(lat2);
	const Δφ = toRad(lat2 - lat1);
	const Δλ = toRad(lon2 - lon1);
	const a =
		Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
		Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	const d = R * c; // in meters
	return d;
}

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
		lat?: string;
		lng?: string;
		website: string;
	};
	dishImageUrl?: string;
}

interface DishCardProps {
	dish: Dish;
}

export default function DishCard({ dish }: DishCardProps) {
	const searchParams = useSearchParams();
	const userLat = parseFloat(searchParams.get("lat") || "");
	const userLng = parseFloat(searchParams.get("long") || "");

	// Support both flat and nested restaurant info
	const restaurant = dish.restaurant || {
		name: dish.restaurantName,
		address: dish.address,
		website: undefined,
		lat: undefined,
		lng: undefined,
	};

	const googleMapsQuery = encodeURIComponent(
		`${restaurant.name} ${restaurant.address}`,
	);
	const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${googleMapsQuery}`;

	let distanceDisplay = null;
	if (
		userLat &&
		userLng &&
		restaurant.lat &&
		restaurant.lng &&
		!Number.isNaN(parseFloat(restaurant.lat)) &&
		!Number.isNaN(parseFloat(restaurant.lng))
	) {
		const distMeters = haversineDistance(
			userLat,
			userLng,
			parseFloat(restaurant.lat),
			parseFloat(restaurant.lng),
		);
		// Use miles if in US, else meters (for now, default to miles)
		// You can improve this by reading the user's country from a header or context
		const isUS = true; // TODO: Replace with real check if available
		distanceDisplay = isUS
			? `${(distMeters / 1609.34).toFixed(1)} mi`
			: `${distMeters.toFixed(0)} m`;
	}
	console.log({ distanceDisplay, userLat, userLng, restaurant });

	return (
		<div className="bg-white border border-brand-border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200 ease-in-out flex flex-col sm:flex-row">
			<div className="sm:w-1/3 h-48 sm:h-auto relative">
				<Image
					src={dish.dishImageUrl || dish.imageUrl || "/placeholder.svg"}
					alt={`Image of ${dish.dishName}`}
					layout="fill"
					className="bg-gray-100"
				/>
			</div>
			<div className="p-4 sm:p-6 flex-1">
				<h3 className="text-xl font-semibold text-brand-primary mb-1">
					{dish.dishName}
				</h3>
				<p className="text-brand-text text-sm leading-relaxed mb-8">
					{dish.description}
				</p>
				<div className="mb-2 flex flex-col gap-1">
					<div className="text-sm text-brand-text-muted font-medium">
						{restaurant.name}
						{distanceDisplay && (
							<span className="ml-2 text-xs text-gray-500">
								({distanceDisplay} away)
							</span>
						)}
					</div>
					{restaurant.website ? (
						<a
							href={restaurant.website}
							target="_blank"
							rel="noopener noreferrer"
							className="block group text-sm text-brand-text-muted font-medium hover:underline"
							style={{ textDecoration: "none" }}
						>
							<span className="block text-xs text-brand-text-muted group-hover:underline">
								{restaurant.address}
							</span>
							<span className="block text-xs text-blue-600 truncate group-hover:underline">
								{restaurant.website
									.replace(/^https?:\/\//, "")
									.replace(/\/$/, "")}
							</span>
						</a>
					) : (
						<div>
							<div className="text-xs text-brand-text-muted">
								{restaurant.address}
							</div>
						</div>
					)}
					<a
						href={googleMapsUrl}
						target="_blank"
						rel="noopener noreferrer"
						className="inline-flex items-center text-xs text-blue-600 hover:underline mt-1"
					>
						Google Maps <GoogleMapsIcon />
					</a>
				</div>
				{dish.rating && (
					<div className="flex items-center mb-3">
						{[...Array(Math.floor(dish.rating))].map((_, i) => (
							<Star
								key={`full-${
									// biome-ignore lint/suspicious/noArrayIndexKey: whocares
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
									// biome-ignore lint/suspicious/noArrayIndexKey: whocares
									i
								}`}
								className="h-5 w-5 text-gray-300"
							/>
						))}
						<span className="ml-2 text-sm text-brand-text-muted">
							{dish.rating}
						</span>
					</div>
				)}
			</div>
		</div>
	);
}
