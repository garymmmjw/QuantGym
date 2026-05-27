# QuantGuide Question

## 836. First Flip

**Metadata**

- ID: `wYSfSrZeF4YfvVPVgDHW`
- URL: https://www.quantguide.io/questions/first-flip
- Topic: probability
- Difficulty: hard
- Internal Difficulty: N/A
- Companies: N/A
- Source: N/A
- Tags: Conditional Expectation, Discrete Random Variables
- Premium: True
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

Jay and John each flip fair coins until they obtain their first heads, respectively. Given that it takes strictly fewer flips for Jay to get his first heads than John, compute the expected number of flips Jay performed. 

### Hint

 Let $X$ and $Y$ respectively count the number of flips needed for Jay and John to get their first heads. We want $\mathbb{E}[X \mid X < Y]$. The distributions of $X$ and $Y$ are IID Geom$\left(\dfrac{1}{2}\right)$.

### 解答

Let $X$ and $Y$ respectively count the number of flips needed for Jay and John to get their first heads. We want $\mathbb{E}[X \mid X < Y]$. The distributions of $X$ and $Y$ are IID Geom$\left(\dfrac{1}{2}\right)$. Using the direct definition of LOTUS, we have $$\mathbb{E}[X \mid X < Y] = \displaystyle \sum_{k=1}^{\infty} k \cdot \mathbb{P}[X = k \mid X < Y] = \sum_{k=1}^{\infty} k \cdot \dfrac{\mathbb{P}[X = k, X < Y]}{\mathbb{P}[X < Y]}$$ The numerator can be written as $\mathbb{P}[X = k, Y > k] = \mathbb{P}[X = k]\mathbb{P}[Y > k]$ by independence of $X$ and $Y$. The PMF of $X$ is $\mathbb{P}[X = k] = \dfrac{1}{2^k}$ for integers $k \geq 1$. Similarly, $\mathbb{P}[Y > k]$ means that it takes more than $k$ flips for John to see his first heads, meaning all of the first $k$ flips are tails. This also occurs with probability $\dfrac{1}{2^k}$. Lastly, we just need to compute $\mathbb{P}[X < Y]$. 

$$$$

Note that as $X$ and $Y$ are IID, they are exchangeable, so $\mathbb{P}[X > Y] = \mathbb{P}[X < Y]$. Furthermore, regardless of the outcome, one of the events $\{X = Y\}, \{X > Y\},$ or $\{X < Y\}$ will occur and they are disjoint. Therefore, $\mathbb{P}[X > Y] + \mathbb{P}[X < Y] + \mathbb{P}[X = Y] = 1$. Substituting in the equality above, $\mathbb{P}[X < Y] = \dfrac{1 - \mathbb{P}[X = Y]}{2}$. It just remains to find $\mathbb{P}[X = Y]$.

$$$$

Simply enough, we just sum over all possible values of $k$ that both $X$ and $Y$ can be, so $\mathbb{P}[X = Y] = \displaystyle \sum_{k=1}^{\infty} \mathbb{P}[X = k] \mathbb{P}[Y = k] = \sum_{k=1}^{\infty} \dfrac{1}{4^k} = \dfrac{\frac{1}{4}}{1 - \frac{1}{4}} = \dfrac{1}{3}$. Thus, $\mathbb{P}[X < Y] = \dfrac{1 - \frac{1}{3}}{2} = \dfrac{1}{3}$ as well.

$$$$

Substituting all of this back into our original summation for $\mathbb{E}[X \mid  X < Y]$, we get $$\mathbb{E}[X \mid X < Y] = \displaystyle \sum_{k=1}^{\infty} k \cdot 3 \cdot \dfrac{1}{4^k} = \sum_{k=1}^{\infty} k \cdot \dfrac{3}{4} \cdot \left(\dfrac{1}{4}\right)^{k-1} = \dfrac{4}{3}$$ We evaluate the last sum by noting that the term after the $k$ is just the PMF of a Geom$\left(\dfrac{3}{4}\right)$ random variable, so we actually showed that $X \mid X < Y \sim \text{Geom}\left(\dfrac{3}{4}\right)$, and thus the expectation is $\dfrac{1}{\frac{3}{4}} = \dfrac{4}{3}$. 

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "4/3"
    ],
    "difficulty": "hard",
    "id": "wYSfSrZeF4YfvVPVgDHW",
    "internalDifficulty": 0,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 6867446,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Expectation"
      },
      {
        "tag": "Discrete Random Variables"
      }
    ],
    "title": "First Flip",
    "topic": "probability",
    "urlEnding": "first-flip"
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "hard",
    "id": "wYSfSrZeF4YfvVPVgDHW",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Conditional Expectation"
      },
      {
        "tag": "Discrete Random Variables"
      }
    ],
    "title": "First Flip",
    "topic": "probability",
    "urlEnding": "first-flip"
  }
}
```
