# QuantGuide Question

## 247. Paper Draw

**Metadata**

- ID: `eTpQ6PkuNqCzp3tGVVrF`
- URL: https://www.quantguide.io/questions/threepeat-dice
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: Citadel
- Source: Citadel OA
- Tags: Conditional Probability, Conditional Expectation, Expected Value
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-10-14 23:51:32 America/New_York
- Last Edited By: Gabe

### 题干

You have two urns presented to you. One of them has the values $1-8$ written on $8$ different pieces of paper. The other one only has the values $1$ and $2$ on $4$ pieces of paper each. You select one urn uniformly at random and then select a piece of paper from it uniformly at random. You see that the paper selected has the value $2$ on it. You then replace the paper in the urn you selected from. If you select from the same urn $40$ more times with replacement between trials, find the expected number of times $2$ would appear in these $40$ draws.

### Hint

Condition on which urn is selected and adjust your probabilities of selecting each urn based on the first turn.

### 解答

Since there are $4$ pieces of paper labelled $2$ in the second urn and only $1$ piece labelled $2$ in the first, the probability we selected the second urn is $\dfrac{4}{5}$. This is directly by Bayes' rule. Given we selected this urn, we would expect to see the value $2$ appear $\dfrac{1}{2} \cdot 40 = 20$ times, as there is probability $\dfrac{1}{2}$ per selection it appears in this urn. If we selected the other urn, which occurs with probability $\dfrac{1}{5}$, then we would expect to see the value $2$ to appear $\dfrac{1}{8} \cdot 40= 5$ times. Therefore, by the Law of Total Expectation, the expected number of times we see the value $2$ is $$\dfrac{4}{5} \cdot 20 + \dfrac{1}{5} \cdot 5 = 17$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "17"
    ],
    "companies": [
      {
        "company": "Citadel"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "eTpQ6PkuNqCzp3tGVVrF",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-14 23:51:32 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 1964254,
    "source": "Citadel OA",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Probability"
      },
      {
        "tag": "Conditional Expectation"
      },
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Paper Draw",
    "topic": "probability",
    "urlEnding": "threepeat-dice",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "Citadel"
      }
    ],
    "difficulty": "medium",
    "id": "eTpQ6PkuNqCzp3tGVVrF",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Conditional Probability"
      },
      {
        "tag": "Conditional Expectation"
      },
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Paper Draw",
    "topic": "probability",
    "urlEnding": "threepeat-dice"
  }
}
```
