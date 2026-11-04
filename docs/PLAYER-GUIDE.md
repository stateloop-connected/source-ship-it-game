# Your first shift

Choose **Garage days** and leave the seed as `HELLO-WORLD` for a repeatable first run. The starting factory includes one station for each stage and four assigned workers. No construction is required to start.

1. Accept one or two contracts from the inbox.
2. Start the shift. One real second is one working hour at 1× speed; eight working hours make a day.
3. Watch the queue counts below the workshop. Packages wait for a staffed station of the required type.
4. Select a workstation to inspect its worker, throughput, wear, policy, and upgrade options.
5. Refill your pipeline as deliveries finish, but stop accepting new work when you have enough contracts to meet the goal. Campaign victory requires no unfinished obligations.

## The crew

Developers cost $150 to hire and $28 per day. They are reliable at every stage and faster at discovery and shipping.

AI agents cost $200 to hire and $18 per day. They build quickly but introduce defects more often. Pair them with a well-staffed quality lab. A dependency outage affects agents if you choose to wait instead of buying a fallback.

QA engineers cost $180 to hire and $32 per day. They work 65% faster at quality labs and improve defect detection.

Hiring adds a worker to the bench. **Select a station → Assigned crew** to put them to work. Assigning someone from another idle workstation leaves that previous station unstaffed. Busy workers cannot be moved. Unassigned crew still earn wages; release them from the crew dialog if you no longer need them.

## The floor

Use **Build a station**, choose a type, and select an empty tile. The shift pauses during construction. A yellow exclamation point means a workstation has no crew.

Move idle stations for free. Close neighbors spend less time transporting work. You can use **List** for the same station selection and tile placement without relying on the illustration.

Each station supports three equipment levels. The first upgrade costs $300; the next costs $600. Each additional level adds 35% of base throughput. Upgrades may be bought while working; policies, moving, and maintenance require idle equipment.

An extra station adds $4 per day in overhead. Selling returns half the station's original purchase price, without refunding upgrades; its worker becomes unassigned. You must retain one station of each type.

## Quality and debt

Discovery reduces a contract's ambiguity. Build can introduce a defect based on worker reliability, remaining ambiguity, technical debt, and work policy.

Rush builds are 55% faster, add more technical debt, and are more likely to create a defect. Debt slows all build benches. Review catches many defects and sends them back for a smaller rebuild. Thorough review is slower but more reliable than quick review.

An escaped defect produces a customer claim 12 working hours after delivery. The claim costs $180, removes 12 reputation, and adds an unpaid warranty job. Warranty jobs are prioritized ahead of ordinary contracts. Completing the repair restores 3 reputation, but does not count as another paid delivery.

Equipment wears while processing work. Maintenance costs $100 and occupies an idle station for four hours, even if it has no worker. Completion resets wear and removes 10 global technical debt.

## Money and deadlines

Contracts require no deposit and pay on delivery. A late delivery receives 70% of its stated fee and costs 4 reputation. An on-time delivery adds 6 reputation.

Every eight working hours the business pays crew wages, $25 rent, and $4 per workstation. Cancelling a contract costs $100 and 8 reputation. It also releases its occupied workstation. Warranty repairs cannot be cancelled.

Garage days gives you 30 days to ship six contracts. The Friday release gives you 20 days for seven contracts, adds 45% more work per stage, and shortens each contract deadline by a day. Both campaigns require at least 45 reputation, nonnegative cash, and no unfinished contracts or pending claims at victory. A cash balance below −$500 ends the campaign immediately.

Sandbox removes the end conditions. You may experiment while insolvent, but purchases still require sufficient cash.

## A sensible opening

Keep two contracts moving. Notice which queue grows. Upgrade the build bench or quality lab before hiring a large crew. Use thorough review until you can afford to absorb warranty costs. Keep a reserve for the next payroll and an unexpected event.

Opening menus pauses the game. Closing them leaves it paused, except resolving an event resumes a shift that had been running. A hidden browser tab pauses automatically. Your factory does not run overnight while the page is closed.

## Save and recovery

The autosave stays on this device and browser origin. Localhost and GitHub Pages have separate saves. Export from the menu and import on the destination to transfer a factory.

Import validates the complete state before replacing your current run. Invalid files leave the current run untouched. Save files must be smaller than 500 KB and use the supported version. A seed link creates a new starting challenge; it does not contain the sender's progress.

## Give the studio a personality

Choose Bootstrappers for lower payroll, Craft Club for better discovery and review, or Night Owls for faster releases. Studio choice is included in challenge links. Try the same seed with each specialty to compare your decisions.

The momentum bar above the floor tracks consecutive on-time deliveries. Starting with the second, each adds a bonus: $50, $100, $150, then $200 per delivery. A late delivery or arriving warranty claim resets the streak. Repairs never count as new paid deliveries.

**Coffee run** costs $80, boosts throughput by 35% for the next four working hours, and has a 16-hour interval between purchases. Trigger it when crew are processing work, not waiting for packages. Pausing preserves the remaining time.

Select the **star** to open the trophy shelf. Each run has six achievements; an earned trophy remains even if a later mistake breaks your streak. Exporting a save includes its trophies. Version-1 saves import into the Original crew specialty, preserving their factory and starting a fresh trophy collection.
