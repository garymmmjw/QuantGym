# QuantGuide Question

## 557. Three Riflemen

**Metadata**

- ID: `Tlv2nvRLVnwAdqC3IVVM`
- URL: https://www.quantguide.io/questions/three-riflemen
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 2
- Companies: WorldQuant
- Source: glassdoor
- Tags: Conditional Probability, Discrete Random Variables
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

Three riflemen $A, B,$ and $C$ take turns shooting at a target. $A$ shoots first, $B$ second, and $C$ third, after which the cycle repeats again with $A$, until one of the riflemen hits the target. Each shot hits the target with probability $1/2$, independent of other shots. Find the probability $A$ wins. 

### Hint

We are looking for the distribution of the first success of a process with probability $1/2$ of success per trial. The distribution of the number of trials needed is $N \sim \text{Geom}(1/2)$. Therefore, $\mathbb{P}[N = k] = \dfrac{1}{2^k}$ for $k \geq 1$. What trials would $A$ win on?

### 解答

We are looking for the distribution of the first success of a process with probability $1/2$ of success per trial. The distribution of the number of trials needed is $N \sim \text{Geom}(1/2)$. Therefore, $\mathbb{P}[N = k] = \dfrac{1}{2^k}$ for $k \geq 1$. If $A$ wins, then the shot is on one of trials $1,4,7,\dots$, as it must cycle back to them. Therefore, the probability of interest is $$\displaystyle \sum_{k=0}^{\infty} \left(\dfrac{1}{2}\right)^{3k+1} = \dfrac{1}{2}\sum_{k=0}^{\infty} \dfrac{1}{8^k} = \dfrac{1}{2} \cdot \dfrac{1}{1-\frac{1}{8}} = \dfrac{4}{7}$$

Another way to quickly see this is that we could call the probability of person $A$ winning $p$. Every outcome where person $B$ has the opportunity to win is the same as person $A$ except scaled by a factor of half since person $B$ must ensure person $A$ misses right before them, so the probability for person $B$ is $\dfrac{1}{2}p$. By the same logic, the probability person $C$ wins is $\dfrac{1}{4}p$. Adding all of these up yields $$p\left(1 + \dfrac{1}{2} + \dfrac{1}{4}\right) = 1 \iff p = \dfrac{4}{7}$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "4/7"
    ],
    "companies": [
      {
        "company": "WorldQuant"
      }
    ],
    "difficulty": "easy",
    "id": "Tlv2nvRLVnwAdqC3IVVM",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 4458109,
    "source": "glassdoor",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Probability"
      },
      {
        "tag": "Discrete Random Variables"
      }
    ],
    "title": "Three Riflemen",
    "topic": "probability",
    "urlEnding": "three-riflemen"
  },
  "list_summary": {
    "companies": [
      {
        "company": "WorldQuant"
      }
    ],
    "difficulty": "easy",
    "id": "Tlv2nvRLVnwAdqC3IVVM",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Conditional Probability"
      },
      {
        "tag": "Discrete Random Variables"
      }
    ],
    "title": "Three Riflemen",
    "topic": "probability",
    "urlEnding": "three-riflemen"
  }
}
```
