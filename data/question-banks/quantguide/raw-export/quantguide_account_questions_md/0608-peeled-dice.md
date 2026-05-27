# QuantGuide Question

## 608. Peeled Dice

**Metadata**

- ID: `2gUCVf48dKtoU6lkgKhO`
- URL: https://www.quantguide.io/questions/peeled-dice
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: Hudson River Trading
- Source: N/A
- Tags: Conditional Expectation
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-10-27 17:23:07 America/New_York
- Last Edited By: Gabe

### 题干

Suppose you roll a fair $6-$sided die and peel that rolled value off the die so that there are five remaining sides with values on them. You roll until you obtain one of the other five values. What is the expected sum of the two rolls?

### Hint

Condition on the value of the first roll.

### 解答

The value on the second roll is going to depend on the value peeled off from the first roll. Therefore, we condition on the value peeled off on the first roll. You roll each value on the die with equal probability, so if $T$ denotes the total of the two rolls, $\mathbb{E}[T] = \mathbb{E}[\mathbb{E}[T \mid X_1]] = \dfrac{1}{6}\sum_{i=1}^6 \mathbb{E}[T \mid X_1 = i]$.

$$$$

$\mathbb{E}[T \mid X_1 = i]$ is now what we need to compute. We know that $i$ is already contributed to our total from the first roll. Then, $i$ is peeled off the die, so that now the remaining values sum to $21 - i$ and there are $5$ equally-likely values. Therefore, the expected value of the second roll given the first is $i$ is $\dfrac{21 - i}{5}$ Thus, $\mathbb{E}[T \mid X_1 = i] = \dfrac{21-i}{5} + i = \dfrac{21+4i}{5}$.

$$$$

Plugging this in, 

\[\begin{aligned}
\mathbb{E}[T] &= \dfrac{1}{6} \sum_{i=1}^6 \dfrac{21+4i}{5} \\ &= \dfrac{7}{10} \sum_{i=1}^6 1 + \dfrac{2}{15} \sum_{i=1}^6 i \\ &= \dfrac{42}{10} + \dfrac{2}{15} \cdot \dfrac{6(7)}{2} = \dfrac{21}{5} + \dfrac{14}{5} = 7
\end{aligned}\]

Another way to think about this is that the expected value that you remove from the first roll is $3.5$, so the expected sum of remaining values is $17.5$. As there are $5$ equally-likely values on the die, the expected value of the second roll is still $3.5$, so adding these two up gives $7$ as well.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "7"
    ],
    "companies": [
      {
        "company": "Hudson River Trading"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "2gUCVf48dKtoU6lkgKhO",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-27 17:23:07 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 4832553,
    "randomizable": "",
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Expectation"
      }
    ],
    "title": "Peeled Dice",
    "topic": "probability",
    "urlEnding": "peeled-dice",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "Hudson River Trading"
      }
    ],
    "difficulty": "medium",
    "id": "2gUCVf48dKtoU6lkgKhO",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Conditional Expectation"
      }
    ],
    "title": "Peeled Dice",
    "topic": "probability",
    "urlEnding": "peeled-dice"
  }
}
```
