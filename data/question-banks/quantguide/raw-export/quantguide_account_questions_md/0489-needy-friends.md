# QuantGuide Question

## 489. Needy Friends

**Metadata**

- ID: `j6DdsKWJVolo3hKawx6s`
- URL: https://www.quantguide.io/questions/needy-friends
- Topic: brainteasers
- Difficulty: hard
- Internal Difficulty: 3
- Companies: N/A
- Source: 536 q4
- Tags: N/A
- Premium: True
- Solution Free: False
- Version: N/A
- Last Edited: 2023-8-26 13:11:56 America/New_York
- Last Edited By: Gabe

### 题干

A rich man sets aside a fixed weekly allowance to distribute to his friends in need. He remarks that if there are $5$ fewer people that need money next week, then each person will receive $\$2$ more than this week. Unfortunately, there were $4$ more people in the following week that needed money compared to this week and everyone received $\$1$ less. How much money did each person receive in the present week (the week that had $4$ less people apply)?

### Hint

Let $x$ be the amount of money that the friend allocates and $n$ be the number of people in the present week that needed money. Then $\dfrac{x}{n}$ was the payout for each of them. Translate what the man says into math and solve for $\dfrac{x}{n}$.

### 解答

Let $x$ be the amount of money that the friend allocates and $n$ be the number of people in the present week that needed money. Then $\dfrac{x}{n}$ was the payout for each of them. We can translate what the man said into math. The first statement says that $$\dfrac{x}{n-5} = \dfrac{x}{n} + 2$$ This is because there are $n-5$ people that need money compared to the previous week. The second statement says that $$\dfrac{x}{n+4} = \dfrac{x}{n} - 1$$ Therefore, the goal is to solve these two equations simultaneously. In the first equation, multiplying by $n(n-5)$ on both sides yields $nx = x(n-5) + 2n(n-5)$, which simplifies to $5x = 2n(n-5) = 2n^2 - 10n$. Multiplying by $n(n+4)$ on both sides in the second equation, $nx = x(n+4) - n(n+4)$, which simplifies to $4x = n(n+4) = n^2 + 4n$. Subtracting twice of the second equation from the first equation yields that $-3x = -18n$, which means that $\dfrac{x}{n} = 6$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "6"
    ],
    "companies": [],
    "difficulty": "hard",
    "hasEdits": false,
    "id": "j6DdsKWJVolo3hKawx6s",
    "internalDifficulty": 3,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-26 13:11:56 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 3882959,
    "source": "536 q4",
    "status": "published",
    "tags": [],
    "title": "Needy Friends",
    "topic": "brainteasers",
    "urlEnding": "needy-friends"
  },
  "list_summary": {
    "companies": [],
    "difficulty": "hard",
    "id": "j6DdsKWJVolo3hKawx6s",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [],
    "title": "Needy Friends",
    "topic": "brainteasers",
    "urlEnding": "needy-friends"
  }
}
```
