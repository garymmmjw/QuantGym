# QuantGuide Question

## 758. Die To Number

**Metadata**

- ID: `frIwbOVjcTbKZioYoUWe`
- URL: https://www.quantguide.io/questions/die-to-number
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: N/A
- Source: AOPS
- Tags: Combinatorics, Events
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

A fair die is tossed 16 times, and the values are recorded in the order they appear. The values are then treated as individual digits and appended together. What is the probability that the resulting number is divisible by 8?

### Hint

A number is divisible by 8 if its last 3 digits are divisible by 8.

### 解答

A number is divisible by 8 if its last 3 digits are divisible by 8. We can therefore ignore the first 13 rolls. 
The last digit must be even, so the final roll must produce either $2, 4, \text{ or } 6$. At this point, we can just list all 3-digit combinations that are divisible by $8$.
\[\begin{aligned}
\text{Ends in 2} &: 112, 152, 232, 312, 352, 432, 512, 552, 632 \\
\text{Ends in 4} &: 144, 224, 264, 344, 424, 464, 544, 624, 664 \\
\text{Ends in 6} &: 136, 216, 256, 336, 416, 456, 536, 616, 656
\end{aligned}\]
We conclude that our probability is $\frac{27}{6^3} = \frac{1}{8}.$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1/8"
    ],
    "difficulty": "easy",
    "id": "frIwbOVjcTbKZioYoUWe",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 6180395,
    "source": "AOPS",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      },
      {
        "tag": "Events"
      }
    ],
    "title": "Die To Number",
    "topic": "probability",
    "urlEnding": "die-to-number"
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "easy",
    "id": "frIwbOVjcTbKZioYoUWe",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Combinatorics"
      },
      {
        "tag": "Events"
      }
    ],
    "title": "Die To Number",
    "topic": "probability",
    "urlEnding": "die-to-number"
  }
}
```
