<script>
    import { Route } from "svelte-router-spa";
    import { onMount } from "svelte";
    import { user } from "../../stores.js";
    import createAuth0Client from "@auth0/auth0-spa-js";
    import auth0Config from "../../auth0-config";

    export let currentRoute;
    
    let auth0;
    let initialized = false;
    
    console.log(`${window.location.origin}/callback`);
    onMount(async () => {
        auth0 = await createAuth0Client(auth0Config);
        const authenticated = await auth0.isAuthenticated();

        if (!authenticated) {
            await auth0.loginWithRedirect({
                redirect_uri: `${window.location.origin}/callback`,
                appState: window.location.pathname,
            });
        } else {
            user.set({
                name: "Test User",
                schoolName: "Test School",
            });
            initialized = true;
        }
    });

    const logout = async () => {
        auth0.logout({
            returnTo: window.location.origin,
        });
    };
</script>

<div>
    {#if initialized}
        <button
            class="button is-light is-small"
            style="float: right;"
            on:click={() => logout()}>Logout</button
        >
        <Route {currentRoute} />
    {/if}
</div>
