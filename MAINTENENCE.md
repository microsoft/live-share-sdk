# Maintanence

> Quick notes & guidelines on how to keep the repo neat & tidy

## Package updates

Dependabot is set up to assist with [package-lock updates](.github/dependabot.yml).

-   SDK packages will be update weekly on Mondays via a PR from dependabot.
-   Samples packages will be updated monthly.
-   Wherever possible, security updates should be done asap.

Human action: If you notice there are PR's from dependabot, please assist with the following:

1. Approving the PR and getting another approver is checks are passing
2. Rebasing and/or fixing merge conflicts if there are any
3. Merging the update once checks are passing & there are 2 approvals
4. After a round of updates, it is a good idea to test the samples again.

## Incoming Issues cleanup

Please keep an eye on incoming bugs / requests. When a new issue comes in, we should check for the following.

1. Verify we have all information required to reproduce the problem / continue with feature planning (Are all of the questions from the templates answered?)
2. Delete the 'Please review' section of the issue, especially when the issue is filed by a Live Share team member:
   ![image](https://user-images.githubusercontent.com/14900841/197058064-bbc56748-09b2-47a1-8c31-6b44a2aa1bc4.png)
3. If needed, bring the newly filed topic up in scrum for discussion:

-   Timeline
-   Assignee
-   Migrate to internal kanban as needed

4. Remove the `new submission` tag. This is for a visible indication that the topic is acknowledged by the team.
    > Note: if the issue is filed by a Live Share team-member, you can delete `new submission` immediately after submitting.

## Announcements

After a new release, we should verify that a post is made to the Discussions center about the release.

## Other considerations

> TBA
