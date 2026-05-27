# QuantGuide Question

## 519. Racecar Speed

**Metadata**

- ID: `AESGq35ELYfg19jFjeeA`
- URL: https://www.quantguide.io/questions/racecar-speed
- Topic: brainteasers
- Difficulty: easy
- Internal Difficulty: 2
- Companies: Belvedere Trading
- Source: Kaushik - Belvedere Glassdoor
- Tags: N/A
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-9-22 16:24:53 America/New_York
- Last Edited By: Gabe

### 题干

A racecar is going around a racetrack three times. The first lap was at a speed of $100$ mph, the second lap was at $150$ mph, and the final lap was at a speed of $200$ mph. What was the average speed (in mph) of the racecar throughout all three laps?

### Hint

Be careful with this problem, we can't simply take the average of the speeds of the laps because the racecar spends different amounts of time around each lap.

### 解答

Be careful with this problem, we can't simply take the average of the speeds of the laps because the racecar spends different amounts of time around each lap. Since we don't know the length of the racetrack, we have to create a variable for how long it takes to go around the racetrack. Say $x$ is the amount of time it takes to go around the first lap in seconds. This means that the second lap will take $\frac{x}{1.5}$ seconds to go around and the third lap will take $\frac{x}{2}$ seconds to go around. That means the average of the speeds (in mph) is
 $$\dfrac{(100\cdot x+150\cdot \frac{x}{1.5}+200\cdot \frac{x}{2})}{x+\frac{x}{1.5}+\frac{x}{2}}=\dfrac{1800}{13}$$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1800/13"
    ],
    "companies": [
      {
        "company": "Belvedere Trading"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "AESGq35ELYfg19jFjeeA",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-22 16:24:53 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 4136944,
    "randomizable": "",
    "source": "Kaushik - Belvedere Glassdoor",
    "status": "published",
    "tags": [],
    "title": "Racecar Speed",
    "topic": "brainteasers",
    "urlEnding": "racecar-speed",
    "version": 2
  },
  "list_summary": {
    "companies": [
      {
        "company": "Belvedere Trading"
      }
    ],
    "difficulty": "easy",
    "id": "AESGq35ELYfg19jFjeeA",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [],
    "title": "Racecar Speed",
    "topic": "brainteasers",
    "urlEnding": "racecar-speed"
  }
}
```
