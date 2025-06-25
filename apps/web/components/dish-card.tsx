import { Star } from "lucide-react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import type { DishRecommendation } from "../../api/lib/types";

function GoogleMapsIcon() {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width={20}
			height={20}
			viewBox="0 0 32 32"
			fill="none"
			className="inline-block w-4 h-4 ml-1 align-text-bottom"
			aria-label="Google Maps"
			role="img"
		>
			<title>Google Maps Icon</title>
			<g>
				<path
					d="M16 2C9.373 2 4 7.373 4 14c0 7.732 10.25 15.25 11.25 15.986a1 1 0 0 0 1.5 0C17.75 29.25 28 21.732 28 14c0-6.627-5.373-12-12-12z"
					fill="#4285F4"
				/>
				<path
					d="M16 6.5A7.5 7.5 0 1 0 16 21.5a7.5 7.5 0 0 0 0-15z"
					fill="#34A853"
				/>
				<path d="M16 6.5v15A7.5 7.5 0 0 0 16 6.5z" fill="#FBBC04" />
				<circle cx="16" cy="14" r="4.5" fill="#EA4335" />
				<circle cx="16" cy="14" r="2.5" fill="#fff" />
			</g>
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

interface DishCardProps {
	recommendation: DishRecommendation;
}

export default function DishCard({ recommendation }: DishCardProps) {
	const searchParams = useSearchParams();
	const userLat = parseFloat(searchParams.get("lat") || "");
	const userLng = parseFloat(searchParams.get("long") || "");

	const restaurant = recommendation.restaurant;

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
		const isUS = true;
		distanceDisplay = isUS
			? `${(distMeters / 1609.34).toFixed(1)} mi`
			: `${distMeters.toFixed(0)} m`;
	}

	const { name: dishName } = recommendation.dish;
	const { name: restaurantName, address } = recommendation.restaurant;
	const imageQuery = encodeURIComponent(
		`${dishName} at ${restaurantName}`,
	);
	const imageSrc = `/api/dish-image?q=${imageQuery}`;

	return (
		<div className="bg-white border border-brand-border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200 ease-in-out flex flex-col sm:flex-row">
			<div
				className="sm:w-1/3 h-48 sm:h-auto relative"
				style={{ aspectRatio: "4 / 3" }}
			>
				<Image
					src={imageSrc}
					alt={`Image of ${dishName} at ${restaurantName}`}
					fill
					className="bg-gray-100 object-cover"
				/>
			</div>
			<div className="p-4 sm:p-6 flex-1">
				<h3 className="text-xl font-semibold text-brand-primary mb-1">
					{recommendation.dish.name}
				</h3>
				<p className="text-brand-text text-sm leading-relaxed mb-8">
					{recommendation.dish.description}
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
				{recommendation.dish.rating && (
					<div className="flex items-center mb-3">
						{[...Array(Math.floor(Number(recommendation.dish.rating)))].map(
							(_, index) => (
								<Star
									key={`full-${recommendation.dish.name}-${index}`}
									className="h-5 w-5 text-yellow-400 fill-yellow-400"
								/>
							),
						)}
						{Number(recommendation.dish.rating) % 1 !== 0 && (
							<Star
								key="half"
								className="h-5 w-5 text-yellow-400"
								style={{ clipPath: "inset(0 50% 0 0)" }}
							/>
						)}
						{[...Array(5 - Math.ceil(Number(recommendation.dish.rating)))].map(
							(_, index) => (
								<Star
									key={`empty-${recommendation.dish.name}-${index}`}
									className="h-5 w-5 text-gray-300"
								/>
							),
						)}
						<span className="ml-2 text-sm text-brand-text-muted">
							{recommendation.dish.rating}
						</span>
					</div>
				)}
			</div>
		</div>
	);
}
