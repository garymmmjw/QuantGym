# QuantGuide Question

## 119. Light Switch

**Metadata**

- ID: `4quvWVZs4lSCUbpUREkT`
- URL: https://www.quantguide.io/questions/light-switch
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: TransMarket Group
- Source: tmg
- Tags: Conditional Probability, Continuous Random Variables
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-11-10 10:37:15 America/New_York
- Last Edited By: Gabe

### 题干

A stoplight displays the colors red (stop), yellow (slow down), and green (go). The colors go in the sequence green $\rightarrow$ yellow $\rightarrow$ red. The light stays green for $40$ seconds until it switches to yellow for $4$ seconds. Afterwards, it turns red for $40$ seconds before turning green again and repeating the cycle. Find the probability that the color of the stoplight switches in a $4$ second interval.

### Hint

The key here is to condition on the color of the light at the start of the interval.

### 解答

The key here is to condition on the color of the light at the start of the interval. In limit, the proportion of the time that the light is yellow is $\dfrac{4}{40 + 4 + 40} = \dfrac{1}{21}$, while the light is green and red for a limiting proportion of $\dfrac{10}{21}$ each. Thus, at the start of the interval, there is probability $\dfrac{1}{21}$ it is yellow, in which you are guaranteed to see a color switch. This is because the light is only yellow for $4$ seconds at a time. There is probability $\dfrac{10}{21}$ it is green, which means the start of the observation period must be in the last $4$ seconds of it being green to observe a color switch. This occurs with probability $\dfrac{1}{10}$, as the total length of the period where the light is green is $40$ seconds. The same calculation applies for red too, so our final probability is $$\dfrac{1}{21} \cdot 1 + \dfrac{10}{21} \cdot \dfrac{1}{10} \cdot 2 = \dfrac{1}{7}$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1/7"
    ],
    "companies": [
      {
        "company": "TransMarket Group"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "4quvWVZs4lSCUbpUREkT",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-10 10:37:15 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 841420,
    "source": "tmg",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Probability"
      },
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Light Switch",
    "topic": "probability",
    "urlEnding": "light-switch",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "TransMarket Group"
      }
    ],
    "difficulty": "easy",
    "id": "4quvWVZs4lSCUbpUREkT",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Conditional Probability"
      },
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Light Switch",
    "topic": "probability",
    "urlEnding": "light-switch"
  }
}
```
