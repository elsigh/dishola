"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, MapPin, SearchIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import type React from "react";
import { useEffect, useState } from "react";

function BluePulseDot() {
	return (
		<span
			className="ml-2 inline-block h-3 w-3 rounded-full bg-blue-500 animate-pulse border border-blue-700"
			title="Improving location..."
		/>
	);
}

function formatLatLng(lat: number, lng: number) {
	return `Lat: ${lat.toFixed(2)}, Lng: ${lng.toFixed(2)}`;
}

export default function SearchSection() {
	const [dishQuery, setDishQuery] = useState("");
	const [latitude, setLatitude] = useState<number | null>(null);
	const [longitude, setLongitude] = useState<number | null>(null);
	const [locationStatus, setLocationStatus] = useState(
		"Set your location to search",
	);
	const [isLocating, setIsLocating] = useState(false);
	const [isImproving, setIsImproving] = useState(false);
	const router = useRouter();

	useEffect(() => {
		// On mount, immediately request geolocation
		if (navigator.geolocation) {
			setIsLocating(true);
			setLocationStatus("Fetching location...");
			navigator.geolocation.getCurrentPosition(
				(position) => {
					const { latitude: lat, longitude: lng, accuracy } = position.coords;
					console.log(
						`[Geolocation:onLoad] lat: ${lat}, lng: ${lng}, accuracy: ${accuracy}`,
					);
					setLatitude(lat);
					setLongitude(lng);
					setLocationStatus(formatLatLng(lat, lng));
					setIsLocating(false);
				},
				(error) => {
					console.error("Geolocation error (onLoad):", error);
					setLocationStatus(
						`Error: ${error.message}. Please set location manually or check permissions.`,
					);
					setIsLocating(false);
				},
				{ enableHighAccuracy: true, maximumAge: 0, timeout: 10000 },
			);
		}
	}, []);

	const handleGeolocate = () => {
		if (!navigator.geolocation) {
			setLocationStatus("Geolocation is not supported by your browser.");
			return;
		}

		setIsLocating(true);
		setIsImproving(false);
		setLocationStatus("Fetching location...");

		let bestAccuracy = Infinity;
		let watchId: number | null = null;
		let timeoutId: number | null = null;
		const accuracyThreshold = 20;

		const updatePosition = (position: GeolocationPosition) => {
			const { latitude: lat, longitude: lng, accuracy } = position.coords;
			console.log(
				`[Geolocation:updatePosition] lat: ${lat}, lng: ${lng}, accuracy: ${accuracy}`,
			);
			setLatitude(lat);
			setLongitude(lng);
			setLocationStatus(formatLatLng(lat, lng));
			setIsLocating(false);
		};

		navigator.geolocation.getCurrentPosition(
			(position) => {
				updatePosition(position);
				bestAccuracy = position.coords.accuracy;

				// If accuracy is not good, start watchPosition for up to 20s
				if (bestAccuracy > accuracyThreshold) {
					setIsImproving(true);
					watchId = navigator.geolocation.watchPosition(
						(pos) => {
							console.log(
								`[Geolocation:watch] lat: ${pos.coords.latitude}, lng: ${pos.coords.longitude}, accuracy: ${pos.coords.accuracy}`,
							);
							bestAccuracy = pos.coords.accuracy;
							updatePosition(pos);
							if (bestAccuracy <= accuracyThreshold) {
								if (watchId !== null) navigator.geolocation.clearWatch(watchId);
								setIsImproving(false);
								if (timeoutId !== null) clearTimeout(timeoutId);
								console.log(
									"[Geolocation:watchPosition] stopped watching - good accuracy",
								);
							}
						},
						(err) => {
							console.error("[Geolocation:watchPosition] error:", err);
						},
						{ enableHighAccuracy: true },
					);
					timeoutId = window.setTimeout(() => {
						if (watchId !== null) navigator.geolocation.clearWatch(watchId);
						setIsImproving(false);
						console.log(
							"[Geolocation:watchPosition] stopped watching - timeout",
						);
					}, 20000);
				}
			},
			(error) => {
				console.error("Geolocation error:", error);
				setLocationStatus(
					`Error: ${error.message}. Please set location manually or check permissions.`,
				);
				setIsLocating(false);
				setIsImproving(false);
			},
			{ enableHighAccuracy: true, maximumAge: 0, timeout: 10000 },
		);
	};

	const handleSearch = (e: React.FormEvent) => {
		e.preventDefault();
		if (!dishQuery.trim() || latitude === null || longitude === null) {
			alert("Please enter a dish and set your location to search.");
			return;
		}
		router.push(
			`/search?q=${encodeURIComponent(dishQuery)}&lat=${latitude}&long=${longitude}`,
		);
	};

	const canSearch =
		dishQuery.trim() !== "" && latitude !== null && longitude !== null;

	return (
		<form onSubmit={handleSearch} className="w-full max-w-xl space-y-6">
			<div>
				<label
					htmlFor="dishQuery"
					className="block text-sm font-medium text-brand-text-muted mb-1"
				>
					What dish are you craving?
				</label>
				<Input
					type="text"
					value={dishQuery}
					onChange={(e) => setDishQuery(e.target.value)}
					placeholder="e.g., Spicy Ramen, Tacos al Pastor, Best Burger"
					className="input-custom w-full text-lg p-3"
					required
				/>
			</div>

			<div>
				{/** biome-ignore lint/a11y/noLabelWithoutControl: <explanation> */}
				<label className="block text-sm font-medium text-brand-text-muted mb-1">
					Location
				</label>
				<div className="flex items-center space-x-2">
					<Button
						type="button"
						onClick={handleGeolocate}
						variant="outline"
						className="btn-custom-secondary flex-grow sm:flex-grow-0 whitespace-nowrap"
						disabled={isLocating}
					>
						{isLocating ? (
							<Loader2 className="mr-2 h-4 w-4 animate-spin" />
						) : (
							<MapPin className="mr-2 h-4 w-4" />
						)}
						Use Current Location
					</Button>
					<button
						type="button"
						className="text-sm ml-2 text-brand-text-muted flex-grow truncate p-2 border border-transparent rounded-md bg-white/50 flex items-center cursor-pointer focus:outline-none border-none text-left"
						onClick={() => {
							if (latitude !== null && longitude !== null) {
								const url = `https://www.google.com/maps?q=${latitude},${longitude}`;
								window.open(url, "_blank", "noopener,noreferrer");
							}
						}}
						disabled={latitude === null || longitude === null}
						tabIndex={0}
						aria-label="Open location in Google Maps"
					>
						{locationStatus}
						{isImproving && <BluePulseDot />}
					</button>
				</div>
			</div>

			<Button
				type="submit"
				className="btn-custom-primary w-full text-lg p-3"
				disabled={!canSearch || isLocating}
			>
				<SearchIcon className="mr-2 h-5 w-5" />
				Find My Dish
			</Button>
		</form>
	);
}
