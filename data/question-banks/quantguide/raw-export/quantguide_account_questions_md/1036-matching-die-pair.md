# QuantGuide Question

## 1036. Matching Die Pair

**Metadata**

- ID: `IHxgyYiwq53mUtQBSPAI`
- URL: https://www.quantguide.io/questions/matching-die-pair
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: N/A
- Source: N/A
- Tags: Events, Conditional Probability
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

Two fair $6-$sided dice are rolled and their upfaces are recorded. Find the probability that if both dice are rolled again, the values rolled on the second trial are the same as on the first trial.

### Hint

We have two cases to consider here, which correspond to the original dice values being the same or different.

### 解答

We have two cases to consider here, which correspond to the original dice values being the same or different. The probability that the first 2 dice rolled show the same value is $\dfrac{6}{6^2} = \dfrac{1}{6}$. Given this, the probability that the the values on the second roll match the first roll is $\dfrac{1}{36}$, as both dice must show that same value. Otherwise, if they differ, which occurs with probability $\dfrac{5}{6}$, the probability that the second rolls match the values on the first rolls is $2 \cdot \dfrac{1}{36} = \dfrac{1}{18}$, as if the original die values are $a$ and $b$ (with $a \neq b$ since we assume here the rolls are distinct), you can either roll $ab$ or $ba$ on your second try. Therefore, the probability of a match is $\dfrac{1}{36} \cdot \dfrac{1}{6} + \dfrac{1}{18} \cdot \dfrac{5}{6} = \dfrac{11}{216}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "11/216"
    ],
    "difficulty": "easy",
    "id": "IHxgyYiwq53mUtQBSPAI",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 8448525,
    "randomizable": "",
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Events"
      },
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Matching Die Pair",
    "topic": "probability",
    "urlEnding": "matching-die-pair"
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "easy",
    "id": "IHxgyYiwq53mUtQBSPAI",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Events"
      },
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Matching Die Pair",
    "topic": "probability",
    "urlEnding": "matching-die-pair"
  }
}
```
