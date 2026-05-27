# QuantGuide Question

## 228. Exact 5 II

**Metadata**

- ID: `ycaZuY1ixF08T0I3NMBE`
- URL: https://www.quantguide.io/questions/exact-5-ii
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: original
- Tags: Conditional Expectation, Discrete Random Variables, Expected Value
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-1 09:58:49 America/New_York
- Last Edited By: Gabe

### 题干

Abd continually rolls a fair $6-$sided die until he obtains his first $6$. Compute the expected number of times Abd obtains the value $5$ before he stops rolling.

### Hint

Let $N$ be the amount of trials needed to obtain the first $6$ and $T$ be the number of times that $5$ appears in total. By Law of Total Expectation, $$\mathbb{E}[T] = \mathbb{E}[\mathbb{E}[T \mid N]]$$

### 解答

Let $N$ be the amount of trials needed to obtain the first $6$ and $T$ be the number of times that $5$ appears in total. By Law of Total Expectation, $$\mathbb{E}[T] = \mathbb{E}[\mathbb{E}[T \mid N]]$$ $\mathbb{E}[T \mid N]$ is fairly easily computed by some slight tricks. Note that if $N$ is the first time $6$ appears, then there are $N-1$ trials before that where $6$ does not appear. Given that $6$ does not appear, each of the other $5$ values are equally-likely to show up in each of the $N-1$ spots. Therefore, $\mathbb{E}[T \mid N] = \dfrac{N-1}{5}$. We know that $N \sim \text{Geom}\left(\dfrac{1}{6}\right)$, as $N$ is a waiting time to see the value $6$. Combining all of this, $$\mathbb{E}[T] = \mathbb{E}\left[\dfrac{N-1}{5}\right] = \dfrac{\mathbb{E}[N] - 1}{5} = 1$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "ycaZuY1ixF08T0I3NMBE",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-1 09:58:49 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 1798429,
    "source": "original",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Expectation"
      },
      {
        "tag": "Discrete Random Variables"
      },
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Exact 5 II",
    "topic": "probability",
    "urlEnding": "exact-5-ii",
    "version": 1
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "ycaZuY1ixF08T0I3NMBE",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Conditional Expectation"
      },
      {
        "tag": "Discrete Random Variables"
      },
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Exact 5 II",
    "topic": "probability",
    "urlEnding": "exact-5-ii"
  }
}
```
