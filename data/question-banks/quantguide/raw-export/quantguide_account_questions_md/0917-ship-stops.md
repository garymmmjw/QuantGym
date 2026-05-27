# QuantGuide Question

## 917. Ship Stops

**Metadata**

- ID: `BVwD65jhyxJQLvCn9xbS`
- URL: https://www.quantguide.io/questions/ship-stops
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: IMC
- Source: IMC
- Tags: Expected Value
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: 2023-8-25 22:24:37 America/New_York
- Last Edited By: Gabe

### 题干

You are sailing from one island to another. Uninterrupted travel between the two islands takes $12$ minutes. However, there are $5$ wave checks between the islands. Four of the wave checks will stop you with $25\%$ probability each. These wave checks will add $1$ minute to your total travel time if you are stopped. However, the last wave check stops you with $75\%$ probability. This wave check will add $4$ minutes to your travel time if you are stopped. Find the expected duration (in minutes) of the trip between the two islands.

### Hint

Let $X_i$ be the number of minutes that wave check $i$, $1 \leq i \leq 5$, stops you for. Let wave check $5$ be the special one. Then $T = 12 + X_1 + \dots + X_5$ gives the total duration of your trip.

### 解答

Let $X_i$ be the number of minutes that wave check $i$, $1 \leq i \leq 5$, stops you for. Let wave check $5$ be the special one. Then $T = 12 + X_1 + \dots + X_5$ gives the total duration of your trip. By Linearity of Expectation, $\mathbb{E}[T] = 12 + \mathbb{E}[X_1] + \dots + \mathbb{E}[X_4] + \mathbb{E}[X_5]$. For $X_1,\dots, X_4$, we know they have the same distribution of $0$ with probability $75\%$ and $1$ with probability $25\%$. Therefore, $\mathbb{E}[X_i] = 0.25 \cdot 1 + 0.75 \cdot 0 = 0.25$ for each of $1 \leq i \leq 4$. Lastly, $X_5$ is $0$ with probability $25\%$ and $4$ with probability $75\%$, so $\mathbb{E}[X_5] = 0.75 \cdot 4 + 0.25 \cdot 0 = 3$. Adding all of these up, our total is $\mathbb{E}[T] = 12 + 4 \cdot 0.25 + 3 = 16$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "16"
    ],
    "companies": [
      {
        "company": "IMC"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "BVwD65jhyxJQLvCn9xbS",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-25 22:24:37 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 7516629,
    "source": "IMC",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Ship Stops",
    "topic": "probability",
    "urlEnding": "ship-stops"
  },
  "list_summary": {
    "companies": [
      {
        "company": "IMC"
      }
    ],
    "difficulty": "easy",
    "id": "BVwD65jhyxJQLvCn9xbS",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Ship Stops",
    "topic": "probability",
    "urlEnding": "ship-stops"
  }
}
```
