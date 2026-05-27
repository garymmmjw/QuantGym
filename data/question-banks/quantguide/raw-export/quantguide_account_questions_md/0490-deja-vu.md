# QuantGuide Question

## 490. Deja Vu

**Metadata**

- ID: `Rdob4hMSz2OSvLmj7mtK`
- URL: https://www.quantguide.io/questions/deja-vu
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: Five Rings
- Source: N/A
- Tags: Expected Value, Discrete Random Variables
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-11-5 10:09:17 America/New_York
- Last Edited By: Gabe

### 题干

Find the expected number of distinct faces observed when rolling a fair $6-$sided die before rolling a face previously observed.

### Hint

$$\mathbb{E}[X] = \displaystyle \sum_{k=1}^{\infty} \mathbb{P}[X \geq k]$. What does the event $\{X \geq k\}$ mean here for an appropriately selected random variable $X$?

### 解答

We solve this using the classic trick $\mathbb{E}[X] = \displaystyle \sum_{k=1}^{\infty} \mathbb{P}[X \geq k]$ for non-negative integer-valued random variables $X$. Let $X$ be the number of distinct faces showing up. We now need to find $\displaystyle \mathbb{P}[X \geq k]$ for $k = 1,2,\dots,6$. We know for $k \geq 7$ this is $0$ since there are only $6$ sides on the die.$$$$$\mathbb{P}[X \geq 1] = 1$, as you have to roll at least one distinct side to be able to repeat it. Now, for $\mathbb{P}[X \geq 2]$, we need to roll any value besides our first face before the first face again. This is determined within one roll, and the probability of this is $\dfrac{5}{6}$, as there are $5$ values that haven't been selected yet. For $\mathbb{P}[X \geq 3]$, we need to obtain 2 distinct faces, which occurs with probability $\dfrac{5}{6}$, and then we need to roll another distinct face on the next turn, which occurs with probability $\dfrac{2}{3}$. Therefore, $\mathbb{P}[X \geq 3] = \dfrac{5}{6} \cdot \dfrac{2}{3} = \dfrac{5}{9}$.$$$$Continuing this pattern, $\mathbb{P}[X \geq 4] = \dfrac{5}{9} \cdot \dfrac{1}{2} = \dfrac{5}{18}$, $\mathbb{P}[X \geq 5] = \dfrac{5}{18} \cdot \dfrac{1}{3} = \dfrac{5}{54}$, and $\mathbb{P}[X \geq 6] = \dfrac{5}{54} \cdot \dfrac{1}{6} = \dfrac{5}{324}$. Therefore, $\mathbb{E}[X]  = \displaystyle \sum_{k=1}^6 \mathbb{P}[X \geq k] = 1 + \dfrac{5}{6} + \dots + \dfrac{5}{324} = \dfrac{899}{324}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "899/324"
    ],
    "companies": [
      {
        "company": "Five Rings"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "Rdob4hMSz2OSvLmj7mtK",
    "internalDifficulty": 2,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-5 10:09:17 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 3893138,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Discrete Random Variables"
      }
    ],
    "title": "Deja Vu",
    "topic": "probability",
    "urlEnding": "deja-vu",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "Five Rings"
      }
    ],
    "difficulty": "medium",
    "id": "Rdob4hMSz2OSvLmj7mtK",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Discrete Random Variables"
      }
    ],
    "title": "Deja Vu",
    "topic": "probability",
    "urlEnding": "deja-vu"
  }
}
```
