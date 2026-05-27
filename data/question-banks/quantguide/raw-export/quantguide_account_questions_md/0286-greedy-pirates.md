# QuantGuide Question

## 286. Greedy Pirates

**Metadata**

- ID: `xYZHCvFwad0prZNexTvP`
- URL: https://www.quantguide.io/questions/greedy-pirates
- Topic: brainteasers
- Difficulty: medium
- Internal Difficulty: 2
- Companies: SIG, Virtu Financial, Goldman Sachs, DE Shaw
- Source: N/A
- Tags: N/A
- Premium: True
- Solution Free: False
- Version: 3
- Last Edited: 2023-11-7 13:11:22 America/New_York
- Last Edited By: Gabe

### 题干

There are five pirates with distinct seniority. Each is rational in that they prioritize staying alive first and getting as much gold as possible second. The five pirates agree on the following method to divide 100 gold coins. The most senior pirate will propose a distribution of the coins. All pirates five pirates vote on whether or not to pass the proposition. If at least 50% of the pirates accept the proposal, the gold is distributed accordingly. Else, the senior pirate is tossed overboard and the process restarts with the next most senior pirate. This method is repeated until a plan is approved. How many gold coins will the most senior pirate get, if any?

### Hint

Reduce this down to the $2-$pirate case to start and work your way up.

### 解答

In the 2-pirate case, the most senior pirate, denoted pirate 2, will distribute all of the gold to himself since he will always get at least 50% of the votes- thus, pirate 1 gets none. Let's add a more senior pirate, pirate 3. Pirate 3 understands that if his plan is voted down, then pirate 1 will not receive anything as the 3-pirate case turns into the 2-pirate case. Thus, pirate 3 offers pirate 1 one coin and keeps the remaining 99 coins. Pirate 3 votes for this and so will pirate 1, else he would receive nothing in the 2-pirate case. In the 4-pirate case, pirate 4 understands that if his plan is voted down, then pirate 2 will get nothing- pirate 2 will settle for one coin if pirate 4 offers him one coin. Thus, this proposition passes with votes from pirates 2 and 4. In the 5-pirate case, pirate 5 understands that if his plan is voted down, both pirate 3 and pirate 1 will get nothing. Therefore, he only needs to offer pirate 1 and pirate 3 one coin each to get their votes and keep the remaining 98 coins. This proposition passes with votes from pirates 1, 3, and 5.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "98"
    ],
    "companies": [
      {
        "company": "SIG"
      },
      {
        "company": "Virtu Financial"
      },
      {
        "company": "Goldman Sachs"
      },
      {
        "company": "DE Shaw"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "xYZHCvFwad0prZNexTvP",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-7 13:11:22 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 2215660,
    "source": "",
    "status": "published",
    "tags": [],
    "title": "Greedy Pirates",
    "topic": "brainteasers",
    "urlEnding": "greedy-pirates",
    "version": 3
  },
  "list_summary": {
    "companies": [
      {
        "company": "SIG"
      },
      {
        "company": "Virtu Financial"
      },
      {
        "company": "Goldman Sachs"
      },
      {
        "company": "DE Shaw"
      }
    ],
    "difficulty": "medium",
    "id": "xYZHCvFwad0prZNexTvP",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [],
    "title": "Greedy Pirates",
    "topic": "brainteasers",
    "urlEnding": "greedy-pirates"
  }
}
```
