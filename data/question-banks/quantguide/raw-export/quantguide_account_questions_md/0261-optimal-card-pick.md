# QuantGuide Question

## 261. Optimal Card Pick

**Metadata**

- ID: `lamqlyFPuLn6Jwc56ypP`
- URL: https://www.quantguide.io/questions/optimal-card-pick
- Topic: brainteasers
- Difficulty: medium
- Internal Difficulty: 3
- Companies: SIG
- Source: SIG
- Tags: N/A
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-20 21:18:19 America/New_York
- Last Edited By: Gabe

### 题干

You are given a standard $52$ card deck. You may select any $5$ cards from the deck to be your hand as long as they form a full house ($3$ cards of one rank and $2$ cards or another). Then, your opponent receives $5$ random cards from the remaining $47$. Let Jack, Queen, King, and Ace have the values $11-14$. The value of a full house is the sum of all the values of the cards that comprise it. For example, $22299$ has value $24$. Find the sum of the values of all optimal full houses. We define optimal here as maximizing the probability of winning with respect to standard poker rules.

### Hint

$$AAAKK$ is not optimal because the kings do not block many straight flushes, which are the main things that can defeat a full house here.

### 解答

Among all full houses, selecting $AAA$ confirms that no other full house will defeat our hand. Therefore, we now want to select our paired rank as to minimize the probability of losing. In this case, we want to minimize the probability of four of a kind or a straight flush. The probability of a four of a kind is the same regardless of which two kicker cards we select, so this doesn't give us any information. However, we do want to minimize the probability of a straight flush. This means we want to select the rank that is involved in the most number of straights.

$$$$

There are fewer straight that involve Aces since we already selected $3$ Aces. Therefore, any rank possessing a straight involving Aces is eliminated. We see that $2-5$ and $10-K$ are all eliminated with this logic. The remaining ranks would be $6-9$, and one can check that there are equal amounts of straights involving each of these values and not Aces. Since no other full house can defeat our hand, we are indifferent to each of these $4$ hands. This means we would pick any of $AAA66,AAA77,AAA88,$ or $AAA99$ to be our hand. The value of each hand is, respectively, $54, 56, 58,$ and $60$, so the sum of these values is $228$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "228"
    ],
    "companies": [
      {
        "company": "SIG"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "lamqlyFPuLn6Jwc56ypP",
    "internalDifficulty": 3,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-20 21:18:19 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 2034574,
    "source": "SIG",
    "status": "published",
    "tags": [],
    "title": "Optimal Card Pick",
    "topic": "brainteasers",
    "urlEnding": "optimal-card-pick",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "SIG"
      }
    ],
    "difficulty": "medium",
    "id": "lamqlyFPuLn6Jwc56ypP",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [],
    "title": "Optimal Card Pick",
    "topic": "brainteasers",
    "urlEnding": "optimal-card-pick"
  }
}
```
