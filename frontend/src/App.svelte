<script>
	import { Router } from "svelte-router-spa";
	import { routes } from "./routes.js";
</script>

<main>
	<section class="section">
		<div class="container">
			<Router {routes} />
		</div>
	</section>
</main>
