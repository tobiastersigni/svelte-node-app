<script>
    import { user } from "../../stores.js";
    import { onMount } from "svelte";
    import axios from "axios";
    import Icon from "svelte-awesome";
    import { refresh } from "svelte-awesome/icons";
    import { add, parseISO, format } from "date-fns";
    import { de } from "date-fns/locale";

    export let currentRoute;
    let routeLunchWeekId = currentRoute.namedParams.lunchWeekId;
    let lunchWeek = {
        lunchDays: [],
    };
    let loading = true;
    let saving = true;
    let publishing = true;

    onMount(async () => {
        try {
            const response = await axios.get(
                `${process.env.API_ROOT}/api/lunch-weeks/${routeLunchWeekId}`
            );
            lunchWeek = response.data;
            seedLunchDays();
            loading = false;
        } catch (e) {
            console.error(e);
        }
    });

    function seedLunchDays() {
        // first, we need to turn the ISO formatted lunchWeek.weekOf
        // date into a date object
        // the parseISO function comes from date-fns
        const weekOfDate = parseISO(lunchWeek.weekOf);
        for (let i = 0; i < 5; i++) {
            // then we loop 5 times, starting with i = 0
            // and adding 1 day each time, e.g., monday, then tuesday, etc
            const calculatedDay = add(weekOfDate, { days: i });
            const formattedDay = format(calculatedDay, "yyyy-MM-dd");

            // if our lunchWeek.lunchDays list already has
            // that day from the server, continue to the next iteration
            if (lunchWeek.lunchDays.some((x) => x.day === formattedDay)) {
                continue;
            }

            // otherwise, create a new child lunch day object
            // and splice it into the list at the correct position
            const lunchDay = {
                day: formattedDay,
                lunchWeekId: lunchWeek.lunchWeekId,
                menuDetails: null,
            };

            lunchWeek.lunchDays.splice(i, 0, lunchDay);
        }
    }

    async function save() {
        saving = true;
        for (let i = 0; i < lunchWeek.lunchDays.length; i++) {
            const lunchDay = lunchWeek.lunchDays[i];

            // if the item has an id, do a PUT
            if (lunchDay.lunchDayId) {
                await axios.put(
                    `${process.env.API_ROOT}/api/lunch-weeks/${routeLunchWeekId}/lunch-day/${lunchDay.lunchDayId}`,
                    lunchDay
                );

                // otherwise do a POST and assign the resulting ID
            } else {
                const response = await axios.post(
                    `${process.env.API_ROOT}/api/lunch-weeks/${routeLunchWeekId}/lunch-day`,
                    lunchDay
                );
                lunchDay.lunchDayId = response.data.lunchDayId;
            }
        }
        saving = false;
    }

    async function togglePublish() {
        publishing = true;
        // first stringify and parse to copy the lunchWeek object
        let lunchWeekPayload = JSON.parse(JSON.stringify(lunchWeek));

        // update the isPublished flag
        lunchWeekPayload.isPublished = !lunchWeekPayload.isPublished;

        // remove the lunchDays list
        delete lunchWeekPayload.lunchDays;
        await axios.put(
            `${process.env.API_ROOT}/api/lunch-weeks/${routeLunchWeekId}`,
            lunchWeekPayload
        );

        // if successful, update the main lunchWeek object's state so that Svelte will react
        lunchWeek.isPublished = !lunchWeek.isPublished;
        publishing = false
    }
</script>

<div>
    <nav class="breadcrumb" aria-label="breadcrumbs">
        <ul>
            <li>
                <a href="/">Home</a>
            </li>
            <li>
                <a href="/admin/manage-menus">Lunch Menu Administration</a>
            </li>
            <li class="is-active">
                <a href="/#">{$user.schoolName}</a>
            </li>
        </ul>
    </nav>
    {#if loading}
        <div class="section">
            <Icon spin data={refresh} scale="3" />
        </div>
    {:else}
        <section>{JSON.stringify(lunchWeek)}</section>
        <section>
            <div class="buttons">
                <button class="button is-link is-small" on:click={() => save()}>
                    Save
                </button>
                <button
                    class="button is-text is-small"
                    on:click={() => togglePublish()}
                >
                    {lunchWeek.isPublished ? "Unpublish" : "Publish"}
                </button>
            </div>
        </section>
        <!-- below the buttons section we just did -->
        <section class="mt-2">
            <div class="columns">
                {#each lunchWeek.lunchDays as lunchDay}
                    <div class="column">
                        <div class="field">
                            <label for="menuDetails" class="label"
                                >{format(
                                    parseISO(lunchDay.day),
                                    "EEE dd.MM.yyyy",
                                    { locale: de }
                                )}</label
                            >
                            <div class="control">
                                <textarea
                                    id="menuDetails"
                                    bind:value={lunchDay.menuDetails}
                                    class="textarea"
                                    rows="10"
                                />
                            </div>
                        </div>
                    </div>
                {/each}
            </div>
        </section>
    {/if}
</div>
