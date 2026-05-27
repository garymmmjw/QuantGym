# QuantGuide Question

## 938. Jellybean Jar II

**Metadata**

- ID: `2lcIX3F8IEoIQbUjtcFv`
- URL: https://www.quantguide.io/questions/jellybean-jar-ii
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: Old Mission
- Source: OMC OA, edited
- Tags: Combinatorics
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: 2023-8-25 23:44:35 America/New_York
- Last Edited By: Gabe

### 题干

A child has a pack of $6$ red and $10$ blue jellybeans. The child wants to eat $4$ jellybeans, so they grab $4$ jellybeans one-by-one uniformly at random without replacement from the pack. Find the probability that the first two and last two jellybeans agree in colors (not necessarily in order). For example, $RBBR$ and $RRRR$ are both valid, but $RRBR$ is not.

### Hint

There are three possibilities for the colors appearing in the first two spots. Namely, they are $RR,BR,$ and $BB$.

### 解答

There are three possibilities for the colors appearing in the first two spots. Namely, they are $RR,BR,$ and $BB$. The first and last case respectively occur when we obtain $RRRR$ and $BBBB$. The probabilities of each of these are $\dfrac{6\cdot 5\cdot 4\cdot 3}{16 \cdot 15 \cdot 14 \cdot 13}$ and $\dfrac{10\cdot 9 \cdot 8 \cdot 7}{16 \cdot 15 \cdot 14 \cdot 13}$. The second case occurs when we have one blue and one red in each of the first and last two spots. As we can arrange the blue and red as $RB$ or $BR$ in each of the first and last two spots, we can multiply the number of ways to get some fixed sequence of one red and one blue in each of the first and last two by $4$. For simplicity, let's say the fixed sequence is $RBRB$. Then we have $4 \cdot \dfrac{10 \cdot 6 \cdot 9 \cdot 5}{16 \cdot 15 \cdot 14 \cdot 13}$ total ways to obtain this case.

$$$$

Adding up our three cases, our total probability is $$\dfrac{6\cdot 5\cdot 4\cdot 3 + 10\cdot 9 \cdot 8 \cdot 7 + 4 \cdot 10 \cdot 6 \cdot 9 \cdot 5 }{16 \cdot 15 \cdot 14 \cdot 13} = \dfrac{135}{364}$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "135/364"
    ],
    "companies": [
      {
        "company": "Old Mission"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "2lcIX3F8IEoIQbUjtcFv",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-25 23:44:35 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 7668332,
    "randomizable": "",
    "source": "OMC OA, edited",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Jellybean Jar II",
    "topic": "probability",
    "urlEnding": "jellybean-jar-ii"
  },
  "list_summary": {
    "companies": [
      {
        "company": "Old Mission"
      }
    ],
    "difficulty": "easy",
    "id": "2lcIX3F8IEoIQbUjtcFv",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Jellybean Jar II",
    "topic": "probability",
    "urlEnding": "jellybean-jar-ii"
  }
}
```
