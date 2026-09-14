# Travel Points Optimizer

A points-versus-cash calculator for comparing the real cost of hotel and flight
booking options.

**Use the calculator:** https://alexpepperl.github.io/travel-points-optimizer/

## What it compares

### Hotels

- Paying cash directly with Marriott
- Redeeming Marriott Bonvoy points
- Using a Marriott free-night certificate, including a points top-off
- Paying with Chase Ultimate Rewards points
- Paying cash through the Chase travel portal
- The value of Chase "The Edit" benefits and property credits
- Marriott's fifth-night-free award benefit

### Flights

- Paying cash directly with the airline
- Redeeming Alaska Atmos Rewards miles
- Redeeming Delta SkyMiles
- Paying with Chase Ultimate Rewards points
- Paying cash through the Chase travel portal

Each option is converted to a true dollar cost using its points valuation, cash
copays, taxes and applicable benefits. The calculator ranks the available options
and shows the cents-per-point value of each redemption.

## Monthly TPG valuations

Default values come from
[The Points Guy's monthly valuations](https://thepointsguy.com/loyalty-programs/monthly-valuations/).
A scheduled GitHub Actions workflow checks TPG on the 15th of each month, validates
the supported program values and updates the calculator and valuation history when
a new month is available.

The updater deliberately fails instead of publishing partial or implausible data if
TPG changes its page structure. Users can override the defaults in the calculator;
custom values are saved in that browser.

## Project structure

| File | Purpose |
| --- | --- |
| `index.html` | Calculator interface, valuation history and calculation logic |
| `scripts/update-tpg-valuations.mjs` | Fetches and validates current TPG valuations |
| `tests/update-tpg-valuations.test.mjs` | Tests extraction, updating and failure behavior |
| `.github/workflows/refresh-tpg-valuations.yml` | Runs the monthly valuation refresh |

The calculator is a static site with no runtime dependencies or build step. Open
`index.html` in a browser to preview it locally.

## Important note

Points values are estimates and can vary by traveler and redemption. Confirm award
availability, taxes and fees with the travel provider before booking.
